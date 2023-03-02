metricMap = new Map();
notificationData = [];
searchDataParams = {
  metricName: '',
  metricId: '',
  companyName: '',
  companyId: '',
  companyMetricId: '',
  analystUid: '',
  searched: false,
};
companies = [];
companyAnalystList = [];
analystIdToNameMap = new Map();
companyMetricMap = new Map();
appData = {};
const firebaseConfig = {
  apiKey: "AIzaSyBvoUkvCv8Hrz0EhZ9TRtLKBPN-g_D9V9s",
  authDomain: "free-cap.firebaseapp.com",
  projectId: "free-cap",
  storageBucket: "free-cap.appspot.com",
  messagingSenderId: "735058447857",
  appId: "1:735058447857:web:fb8ff6944d749874544850",
  measurementId: "G-ZBE2NWH8NY",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.functions();
const storage = firebase.storage();
var firebaseUser;
const defaultPassword = 'KBPN-g_D9V9s';
fetchRelaunchPadDataResults = [];
const $root = $('html, body');
const companyNameArray = [
  "company1", "company2", "company3", "company4", "company5", "company6",
  "company7", "company8", "company9", "company10", "company11", "company12",
  "company13", "company14", "company15",
];

function loginWithEmail(email, onError) {
  auth.signInWithEmailAndPassword(email, defaultPassword)
    .then((userCredential) => {
      firebaseUser = userCredential.user;
    })
    .catch((error) => {
      onError();
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
        case 'auth/invalid-password':
          alert('Invalid login details.');
          break;
        case 'auth/network-request-failed':
          alert('Please check network connection.');
          break;
        case 'auth/user-disabled':
          alert('Please contact support.');
          break;
        default:
          alert('Something went wrong.');
      }
    });
}

function createAccount(email, name) {
  date = new Date();
  secondaryApp = firebase
    .initializeApp(firebaseConfig, 'Secondary' + date.getTime());
  secondaryApp.auth().createUserWithEmailAndPassword(email, defaultPassword)
    .then((userCredential) => {
      data = {
        name,
        email,
        level: 'analyst',
        dateAdded: new Date(),
      }
      db.collection('user').doc(userCredential.user.uid).set(data)
        .then(() => {
          $('#analystEmail').val('');
          $('#analystName').val('');
          alert('Analyst created successfully');
          $('#register-button').prop('disabled', false);
          $('.register-button-toggle').toggle();
        })
        .catch((_) => {
          alert('Something went wrong.');
          $('#register-button').prop('disabled', false);
          $('.register-button-toggle').toggle();
        });
      secondaryApp.delete();
    })
    .catch((error) => {
      $('#register-button').prop('disabled', false);
      $('.register-button-toggle').toggle();
      secondaryApp.delete();

      switch (error.code) {
        case 'auth/invalid-email':
          alert('Invalid email.');
          break;
        case 'auth/email-already-in-use':
          alert('Email already exists.');
          break;
        case 'auth/network-request-failed':
          alert('Please check network connection.');
          break;
        case 'auth/weak-password':
          alert('Please contact support.');
          break;
        default:
          alert('Something went wrong.');
      }
    });
}

async function initFirebaseData() {
  userSnapshot = await db.doc(`user/${firebaseUser.uid}`).get();
  userData = userSnapshot.data();
  if (!userData || userData.level != 'admin') {
    auth.signOut();
    $('#loginButton').prop('disabled', false);
    $('.login-button-toggle').toggle();
    return alert('Invalid login details - Not an admin.');
  }

  let [
    analystSnapshot,
    companySnapshot,
    metricSnapshot,
    appDataSnapshot,
    companyMetricSnapshot,
    notificationSnapshot,
  ] = await Promise.all([
    db.collection('user').get(),
    db.collection('data/app/company').get(),
    db.collection('data/app/metric').get(),
    db.doc('data/app').get(),
    db.collection('company_metric').get(),
    db.collection('notification')
      .where('uid', '==', firebaseUser.uid)
      .where('seen', '==', false)
      .orderBy('date_added', 'desc')
      .get(),
  ]).catch((e) => { alert('Something went wrong. Please reload the page.'); });

  companyAnalystList = [];
  analystIdToNameMap.clear();
  companyMetricMap.clear();
  metricMap.clear();

  analystSnapshot.forEach((e) => {
    data = e.data();
    companyAnalystList.push({ id: e.id, name: data.name + ' - ' + data.level });
    analystIdToNameMap.set(e.id, data.name);
  });
  companies = companySnapshot.docs.map((e) => {
    return { id: e.id, ...e.data() };
  });
  console.log(companySnapshot);
  metricSnapshot.docs.map((e) => {
    metricMap.set(e.id, { id: e.id, ...e.data() });
  });
  appData = appDataSnapshot.data();
  companyMetricSnapshot.forEach((e) => {
    companyMetricMap.set(e.id, { id: e.id, ...e.data() });
  });
  notificationData = notificationSnapshot.docs.map((e) => {
    return { id: e.id, ...e.data() };
  });

  $(() => {
    $('#auth-unknown-container').hide();
    $('#auth-success-container').show();

    loadSystemFiles();
    initLoadedData();
    initTableSortable();
    initVerificationTable();
  });
}

function initVerificationTable() {
  var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
  data = [];
  companies.forEach((company) => {
    data.push({
      company: company.company1,
      correctionalFacilitiesVendor: company.verification ? 'YES' : 'NO',
      totalContractValue: company.verification
        ? formatter.format(company.verification)
        : 'Not Applicable',
    });
  });

  var columns = {
    company: 'COMPANY',
    correctionalFacilitiesVendor: 'CORRECTIONAL FACILITIES VENDOR?',
    totalContractValue: 'TOTAL CONTRACT VALUE',
  };

  $('#verification-table').tableSortable({
    data: data,
    columns: columns,
    rowsPerPage: 25,
    pagination: true,
    sortingIcons: {
      asc: '<i class="fa fa-sort-alpha-asc"></i>',
      desc: '<i class="fa fa-sort-alpha-desc"></i>',
    },
    formatCell: function (row, key) {
      if (key === 'correctionalFacilitiesVendor') {
        return $(
          `<div class="text-center">
            <span class="badge bg-${row[key] == 'YES' ? 'success' : 'danger'} w-50 border border-dark">${row[key]}</span>
          </div>`
        );
      }
      return row[key];
    },
    formatHeader: function (columnValue, columnKey, index) {
      if (columnKey === 'correctionalFacilitiesVendor') {
        return $(
          `<div class="text-center">
              <span class="bold">${columnValue}</span>
            </div>`
        );
      }
      return columnValue;
    },
    sorting: ['company'],
    searchField: '#verification-table-search',
  });
}

function initTableSortable() {
  data = []
  metricKeys = Array.from(metricMap.keys());
  companies.forEach((company) => {
    metricKeys.forEach((f) => {
      metric = metricMap.get(f);
      companyMetricId = company.id + metric.id;
      companyMetric = companyMetricMap.get(companyMetricId);
      data.push({
        company: company.company1,
        companyId: company.id,
        metric: metric.metric,
        metricId: metric.id,
        id: companyMetricId,
        status: companyMetric?.status ?? 'Not Assigned',
        score: companyMetric?.metricScoring ?? '0',
        view: '',
        assignedTo: companyMetric?.analystUid ?? '',
      })
    })
  });

  var columns = {
    company: 'COMPANY',
    metric: 'METRIC',
    status: 'STATUS',
    score: 'SCORE',
    view: '',
    assignedTo: 'ASSIGNED TO',
  };

  $('#table-sortable').tableSortable({
    data: data,
    columns: columns,
    rowsPerPage: 25,
    pagination: true,
    sortingIcons: {
      asc: '<i class="fa fa-sort-alpha-asc"></i>',
      desc: '<i class="fa fa-sort-alpha-desc"></i>',
    },
    formatCell: function (row, key) {
      if (key === 'status') {
        selectedOption = '';
        options = '';
        appData.adminStatus.forEach((e) => {
          options += `
          <option value="${e}" ${row[key] == e ? 'selected' : ''} ${appData.adminStatusDisabled.includes(e) ? 'disabled hidden' : ''}>${e}</option>
          `;
          if (row[key] == e) selectedOption = e;
        });
        bgColor = 'bg-white';
        textColor = 'text-black';
        switch (row[key]) {
          case 'Assigned':
            bgColor = 'bg-blue';
            textColor = 'text-white';
            break;
          case 'Submitted':
            bgColor = 'bg-purple';
            textColor = 'text-white';
            break;
          case 'Needs Update':
            bgColor = 'bg-orange';
            textColor = 'text-white';
            break;
          case 'Approved':
            bgColor = 'bg-success';
            textColor = 'text-white';
            break;
          case 'Not Assigned':
            bgColor = 'c-bg-yellow';
            break;
        }
        return $(`
        <span class="sr-only">${selectedOption}</span>
        <select class="form-select select-status ${bgColor} ${textColor}"  data-company-metric-id="${row.id}">${options}</select>
        `);
      }
      if (key === 'score') {
        return $(`
        <input disabled class="form-control text-center metric-score" value="${row[key]}" style="width: 4rem;">
        `);
      }
      if (key === 'view') {
        return $(`
        <button type="button" class="btn btn-small btn-success view-status-table-view-button rounded-pill px-3 py-1" id="view-button-${row.id}" data-company-metric-id="${row.id}">View</button>
        `);
      }
      if (key === 'assignedTo') {
        analystData = `<option value="" disabled hidden ${!row[key] ? 'selected' : ''}>Select Analyst</option>`;
        selectedAnalyst = '';
        addClass = 'text-primary border-primary';
        for (i = 0; i < companyAnalystList.length; i++) {
          analyst = companyAnalystList[i];
          analystData += `<option value="${analyst.id}" ${row[key] == analyst.id ? 'selected' : ''}>${analyst.name}</option>`;
          if (row[key] == analyst.id) {
            addClass = 'text-blue border-blue';
            selectedAnalyst = analyst.name;
          }
        }
        return $(`
        <span class="sr-only">${selectedAnalyst}</span>
        <select class="form-select ${addClass} rounded-pill company-analyst-select" data-company-metric-id="${row.id}" data-company-id="${row['companyId']}" data-company-name="${row['company']}" data-metric-id="${row['metricId']}" data-metric-name="${row['metric']}">
            ${analystData}
          </select>
        `);
      }
      return row[key];
    },
    sorting: ['company'],
    searchField: '#view-status-table-search',
    tableDidUpdate: tableSortableListeners,
  });
  tableSortableListeners();
}

function idFromName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}

function tableSortableListeners() {
  $('.company-analyst-select').on('change', function () {
    $this = $(this);
    analystUid = $this.val();
    if (!analystUid) {
      $this.removeClass('text-blue').removeClass('border-blue').addClass('text-primary').addClass('border-primary');
      return;
    }
    $this.removeClass('text-primary').removeClass('border-primary').addClass('text-blue').addClass('border-blue');
    companyMetricId = $this.attr('data-company-metric-id');
    companyName = $this.attr('data-company-name');
    metricName = $this.attr('data-metric-name');

    data = {
      analystUid: analystUid,
      companyId: $this.attr('data-company-id'),
      companyName: companyName,
      dateAssigned: new Date(),
      metricId: $this.attr('data-metric-id'),
      metricName: metricName,
      status: 'Assigned',
    }
    db.doc(`company_metric/${companyMetricId}`)
      .set(data, { merge: true })
      .then(() => {
        $this.closest('tr').find('.select-status').val('Assigned').trigger('change');
        alert('Assigned successfully');
      })
      .catch((_) => {
        $this.removeClass('text-blue').removeClass('border-blue').addClass('text-primary').addClass('border-primary').val('');
        alert('Something went wrong.');
      });
    db.collection('notification').add({
      seen: false,
      uid: analystUid,
      message: `${companyName} (${metricName}) has been assigned to you.`,
      company_metric_id: companyMetricId,
      date_added: new Date(),
    });
    $this.prev().val(analystIdToNameMap.get(analystUid));
  });

  $('.view-status-table-view-button').on('click', function () {
    $this = $(this);
    $root.animate({
      scrollTop: $('#getCompanyData').offset().top
    }, 500);

    tr = $this.closest('tr');
    $('#companyNameInput').val(tr.children().eq(0).text());
    $('#metricNameInput').val(tr.children().eq(1).text()).trigger('input');
    $('#getCompanyData').trigger('click');
    return;
  });

  $('.select-status').on('change', function () {
    $this = $(this);
    companyMetricId = $this.attr('data-company-metric-id')

    bgColor = 'bg-white';
    textColor = 'text-black';
    switch (this.value) {
      case 'Assigned':
        bgColor = 'bg-blue';
        textColor = 'text-white';
        break;
      case 'Submitted':
        bgColor = 'bg-purple';
        textColor = 'text-white';
        break;
      case 'Needs Update':
        tr = $this.closest('tr');
        select = tr.find('.company-analyst-select');
        analystUid = select.val();
        if (!analystUid) {
          alert('Cannot set status as "Needs Update" when it has not been assigned to analyst.');
          $this.removeClass('bg-blue').removeClass('text-white').removeClass('bg-blue').removeClass('bg-purple').removeClass('bg-orange').removeClass('bg-success').removeClass('bg-white').addClass('c-bg-yellow').addClass('text-black').val('Not Assigned').prev().text('Not Assigned');
          return;
        }

        bgColor = 'bg-orange';
        textColor = 'text-white';

        companyName = tr.children().eq(0).text();
        metricName = tr.children().eq(1).text();

        db.collection('notification').add({
          seen: false,
          uid: analystUid,
          message: `${companyName} (${metricName}) needs update.`,
          company_metric_id: companyMetricId,
          date_added: new Date(),
        });
        db.doc(`company_metric/${companyMetricId}`).update({
          status: this.value,
        })
          .then(() => {
            alert(`Status updated to "${this.value}"`);
          })
          .catch((_) => {
            alert('Something went wrong.');
          });
        break;
      case 'Approved':
        bgColor = 'bg-success';
        textColor = 'text-white';
        db.doc(`company_metric/${companyMetricId}`).update({
          status: this.value,
          adminUid: firebaseUser.uid,
        })
          .then(() => {
            alert(`Status updated to "${this.value}"`);
          })
          .catch((_) => {
            alert('Something went wrong.');
          });
        break;
      case 'Not Assigned':
        bgColor = 'c-bg-yellow';
        tr = $this.closest('tr');

        db.doc(`company_metric/${companyMetricId}`).delete()
          .then(() => {
            alert(`Status updated to "${this.value}"`);
            tr.find('.company-analyst-select').val('').trigger('change');
            tr.find('.metric-score').val('0');
          })
          .catch((_) => {
            alert('Something went wrong.');
          });
        break;
    }
    $this.removeClass('bg-blue').removeClass('text-white').removeClass('bg-blue').removeClass('c-bg-yellow').removeClass('bg-purple').removeClass('bg-orange').removeClass('bg-success').removeClass('bg-white').removeClass('text-black').addClass(bgColor).addClass(textColor).prev().text($this.val());
  });
}

function initLoadedData() {
  for (i = 0; i < companies.length; i++) {
    $('#companyNameOptions')
      .append(`<option value="${companies[i].company1}"></option>`)
  }

  metricKeys = Array.from(metricMap.keys());
  for (i = 0; i < metricKeys.length; i++) {
    metric = metricMap.get(metricKeys[i]);
    $('#metricListOptions')
      .append(
        `<option value="${metric.metric}" data-id="${metric.id}"></option>`
      );
  }

  notifLength = notificationData.length;
  $('#notification-count').text(notifLength);
  for (i = 0; i < notifLength; i++) {
    notif = notificationData[i];
    $('#notificationDropDownMenuContent')
      .append(
        `<li><a class="dropdown-item" data-notif-id="${notif.id}" data-company-metric-id="${notif.company_metric_id}" href="#">${notif.message}</a></li>`
      );
  }
  if (notifLength > 0) {
    $('#notificationDropDownMenuContent li a').on('click', function () {
      $this = $(this);
      notifLength -= 1;
      id = $this.attr('data-company-metric-id');
      notifId = $this.attr('data-notif-id');
      db.doc(`notification/${notifId}`).update({ seen: true });
      $('#notification-count').text(notifLength);
      $this.remove();
      $(`#view-button-${id}`).trigger('click');

      if (notifLength == 0) {
        $('#notificationDropDownMenuContent')
          .append(
            `<li><a class="dropdown-item" href="#">No Notifications.</a></li>`
          );
        $('#notification-count').hide();
      }
    })
  } else {
    $('#notificationDropDownMenuContent')
      .append(
        `<li><a class="dropdown-item" href="#">No Notifications.</a></li>`
      );
    $('#notification-count').hide();
  }

  $('#logout').on('click', () => {
    auth.signOut();

    $('#loginButton').prop('disabled', false);
    $('#login-button-toggle-text').show();
    $('#login-button-toggle-spinner').hide();
  });
}

function setDocumentData(data) {
  $('#companyNameInput').val(data.companyName);
  $('#metricNameInput').val(data.metricName).trigger('input');
  $('#companyTypeInput').val(data.companyType);
  $('#averageRating').val(data.averageRating);
  $('#averageBenefitRating').val(data.averageBenefitRating);
  $('#companySize').val(data.companySize);
  $('#industryInput').val(data.industry);
  $('#reviewCount').val(data.reviewCount);
  $('#companyHomePage').val(data.companyHomePage);
  if (data.companyHomePage)
    $('#companyHomePageHref').attr('href', data.companyHomePage);
  if (data.glassdoorHomePage)
    $('#openGlassdoorButton').attr('href', data.glassdoorHomePage);
  $('#careerPage').val(data.careerPage);
  if (data.careerPage)
    $('#careerPageHref').attr('href', data.careerPage);
  $('#aboutUsPage').val(data.aboutUsPage);
  if (data.aboutUsPage)
    $('#aboutUsPageHref').attr('href', data.aboutUsPage);
  $('#csrPage').val(data.csrPage);
  if (data.csrPage) $('#csrPageHref').attr('href', data.csrPage);

  if (data.companyLinks0) {
    $('#companyLinks0').val(data.companyLinks0);
    $('#companyLinks0Href').attr('href', data.companyLinks0);
    $('#company-links-indicator0').addClass(data.companyLinksIndicator0 ?? '').attr('data-color', data.companyLinksIndicator0);
  }
  if (data.companyLinks1) {
    $('#companyLinks1').val(data.companyLinks1);
    $('#companyLinks1Href').attr('href', data.companyLinks1);
    $('#company-links-indicator1').addClass(data.companyLinksIndicator1 ?? '').attr('data-color', data.companyLinksIndicator1);
  }
  if (data.companyLinks2) {
    $('#companyLinks2').val(data.companyLinks2);
    $('#companyLinks2Href').attr('href', data.companyLinks2);
    $('#company-links-indicator2').addClass(data.companyLinksIndicator2 ?? '').attr('data-color', data.companyLinksIndicator2);
  }
  if (data.companyLinks3) {
    $('#companyLinks3').val(data.companyLinks3);
    $('#companyLinks3Href').attr('href', data.companyLinks3);
    $('#company-links-indicator3').addClass(data.companyLinksIndicator3 ?? '').attr('data-color', data.companyLinksIndicator3);
  }
  if (data.companyLinks4) {
    $('#companyLinks4').val(data.companyLinks4);
    $('#companyLinks4Href').attr('href', data.companyLinks4);
    $('#company-links-indicator4').addClass(data.companyLinksIndicator4 ?? '').attr('data-color', data.companyLinksIndicator4);
  }
  if (data.companyLinks5) {
    $('#companyLinks5').val(data.companyLinks5);
    $('#companyLinks5Href').attr('href', data.companyLinks5);
    $('#company-links-indicator5').addClass(data.companyLinksIndicator5 ?? '').attr('data-color', data.companyLinksIndicator5);
  }
  if (data.companyLinks6) {
    $('#companyLinks6').val(data.companyLinks6);
    $('#companyLinks6Href').attr('href', data.companyLinks6);
    $('#company-links-indicator6').addClass(data.companyLinksIndicator6 ?? '').attr('data-color', data.companyLinksIndicator6);
  }
  if (data.companyLinks7) {
    $('#companyLinks7').val(data.companyLinks7);
    $('#companyLinks7Href').attr('href', data.companyLinks7);
    $('#company-links-indicator7').addClass(data.companyLinksIndicator7 ?? '').attr('data-color', data.companyLinksIndicator7);
  }
  if (data.companyLinks8) {
    $('#companyLinks8').val(data.companyLinks8);
    $('#companyLinks8Href').attr('href', data.companyLinks8);
    $('#company-links-indicator8').addClass(data.companyLinksIndicator8 ?? '').attr('data-color', data.companyLinksIndicator8);
  }
  if (data.companyLinks9) {
    $('#companyLinks9').val(data.companyLinks9);
    $('#companyLinks9Href').attr('href', data.companyLinks9);
    $('#company-links-indicator9').addClass(data.companyLinksIndicator9 ?? '').attr('data-color', data.companyLinksIndicator9);
  }

  if (data.metricScoring)
    $(`input[name=metric-scoring-option][value=${data.metricScoring}]`)
      .prop('checked', true);

  relaunchNotAvailable = $('#relaunchNotAvailable');
  relaunchNotAvailable.hide();
  if (data.relaunchPadVerification == 'HIGH CHANCE') {
    relaunchNotAvailable.attr('data-value', 'HIGH CHANCE');
    $('#rlpHC').show();
  } else if (data.relaunchPadVerification == 'AVERAGE CHANCE') {
    relaunchNotAvailable.attr('data-value', 'AVERAGE CHANCE');
    $('#rlpAC').show();
  } else if (data.relaunchPadVerification == 'LOW CHANCE') {
    relaunchNotAvailable.attr('data-value', 'LOW CHANCE');
    $('#rlpLC').show();
  } else if (data.relaunchPadVerification == 'NOT LISTED') {
    relaunchNotAvailable.attr('data-value', 'NOT LISTED');
    $('#rlpNL').show();
  } else {
    relaunchNotAvailable.attr('data-value', 'NOT AVAILABLE');
    relaunchNotAvailable.show();
  }

  scbcNotAvailable = $('#scbcNotAvailable');
  scbcNotAvailable.hide();
  if (data.scbcVerification == 'LISTED') {
    scbcNotAvailable.attr('data-value', 'LISTED');
    $('#scbcListed').show();
  } else if (data.scbcVerification == 'NOT LISTED') {
    scbcNotAvailable.attr('data-value', 'NOT LISTED');
    $('#scbcNotListed').show();
  } else {
    scbcNotAvailable.attr('data-value', 'NOT AVAILABLE');
    scbcNotAvailable.show();
  }

  prisonNotAvailable = $('#prisonNotAvailable');
  prisonNotAvailable.hide();
  if (data.prisonsVerification == 'LISTED') {
    prisonNotAvailable.attr('data-value', 'LISTED');
    $('#prisonListed').show();
  } else if (data.prisonsVerification == 'NOT LISTED') {
    prisonNotAvailable.attr('data-value', 'NOT LISTED');
    $('#prisonNotListed').show();
  } else {
    prisonNotAvailable.attr('data-value', 'NOT AVAILABLE');
    prisonNotAvailable.hide();
  }

  for (i = 0; i < data.comments?.length ?? 0; i++) {
    $('#comment-container').append(
      `<div class="alert alert-secondary comment-data" data-type="old">
        ${data.comments[i]}
      </div>`
    );
  }

  for (i = 0; i < data.otherLinks?.length ?? 0; i++) {
    otherLink = data.otherLinks[i];
    $('#companyLinksTable tbody').append(
      `<tr class="align-baseline">
        <th scope="row">
          <label for="otherLinks${i}" class="col-form-label">
            ${otherLink.label}:
          </label>
        </th>
        <td>
          <input type="text" id="otherLinks${i}" class="form-control 
          another-link-input" value="${otherLink.url}">
        </td>
        <td style="width: 1rem;">
          <a class="fa fa-external-link text-decoration-none" target="_blank" href="${otherLink.url}"
          </a>
        </td>
      </tr>`
    );
  }
}

function submitData() {
  analystUid = searchDataParams.analystUid;
  if (analystUid == '') analystUid = firebaseUser.uid;
  otherLinks = [];
  $('.another-link-input').each(function (i, obj) {
    $this = $(this);
    label = $this.closest('tr').find('label').text().trim();
    otherLinks.push({ label, url: $this.val().trim() });
  });

  metricName = $('#metricNameInput').val().trim();
  data = {
    companyName: $('#companyNameInput').val().trim(),
    companyId: searchDataParams.companyId,
    metricName: metricName,
    metricId: searchDataParams.metricId,
    status: searchDataParams.analystUid ? 'Needs Update' : 'Submitted',
    companyType: $('#companyTypeInput').val().trim(),
    averageRating: $('#averageRating').val().trim(),
    averageBenefitRating: $('#averageBenefitRating').val().trim(),
    companySize: $('#companySize').val().trim(),
    industry: $('#industryInput').val().trim(),
    reviewCount: $('#reviewCount').val().trim(),
    glassdoorHomePage: $('#openGlassdoorButton').attr('href').trim(),
    companyHomePage: $('#companyHomePage').val().trim(),
    careerPage: $('#careerPage').val().trim(),
    aboutUsPage: $('#aboutUsPage').val().trim(),
    csrPage: $('#csrPage').val().trim(),
    otherLinks: otherLinks,
    companyLinks0: $('#companyLinks0').val().trim(),
    companyLinks1: $('#companyLinks1').val().trim(),
    companyLinks2: $('#companyLinks2').val().trim(),
    companyLinks3: $('#companyLinks3').val().trim(),
    companyLinks4: $('#companyLinks4').val().trim(),
    companyLinks5: $('#companyLinks5').val().trim(),
    companyLinks6: $('#companyLinks6').val().trim(),
    companyLinks7: $('#companyLinks7').val().trim(),
    companyLinks8: $('#companyLinks8').val().trim(),
    companyLinks9: $('#companyLinks9').val().trim(),
    companyLinksIndicator0:
      $('#company-links-indicator0').attr('data-color') ?? '',
    companyLinksIndicator1:
      $('#company-links-indicator1').attr('data-color') ?? '',
    companyLinksIndicator2:
      $('#company-links-indicator2').attr('data-color') ?? '',
    companyLinksIndicator3:
      $('#company-links-indicator3').attr('data-color') ?? '',
    companyLinksIndicator4:
      $('#company-links-indicator4').attr('data-color') ?? '',
    companyLinksIndicator5:
      $('#company-links-indicator5').attr('data-color') ?? '',
    companyLinksIndicator6:
      $('#company-links-indicator6').attr('data-color') ?? '',
    companyLinksIndicator7:
      $('#company-links-indicator7').attr('data-color') ?? '',
    companyLinksIndicator8:
      $('#company-links-indicator8').attr('data-color') ?? '',
    companyLinksIndicator9:
      $('#company-links-indicator9').attr('data-color') ?? '',
    metricScoring: $('input[type=radio][name=metric-scoring-option]:checked')
      .val().trim(),
    analystUid: analystUid,
    adminUid: firebaseUser.uid,
    relaunchPadVerification: $('#relaunchNotAvailable').attr('data-value'),
    scbcVerification: $('#scbcNotAvailable').attr('data-value'),
    prisonsVerification: $('#prisonNotAvailable').attr('data-value'),
  }

  companyMetricId = searchDataParams.companyMetricId;
  db.doc(`company_metric/${companyMetricId}`).set(data, { merge: true })
    .then(() => {
      commentData = $('.comment-data');
      commentData.each(function (i, obj) {
        comments = firebase.firestore.FieldValue.arrayUnion($(this).text().trim());
        db.doc(`company_metric/${companyMetricId}`)
          .set({ comments }, { merge: true });
      });

      if (commentData.length && searchDataParams.analystUid != '') {
        db.collection('notification').add({
          seen: false,
          uid: analystUid,
          message: `${data.companyName} (${metricName}) has a new comment.`,
          company_metric_id: companyMetricId,
          date_added: new Date(),
        });
      }
      $('#submit-data').prop('disabled', false);
      $('.submit-data-button-loading-toggle').toggle();
      clearAllData();
      alert('Data submitted successfully');
    })
    .catch((_) => {
      alert('Something went wrong.');
      $('#submit-data').prop('disabled', false);
      $('.submit-data-button-loading-toggle').toggle();
    });
}

auth.onAuthStateChanged((user) => {
  if (user) {
    firebaseUser = user;
    initFirebaseData();
  } else {
    firebaseUser = null;
    $('#auth-loading-container').hide();
    $('#auth-unknown-container').show();
    $('#auth-failure-container').show();
    $('#auth-success-container').hide();
  }
});

function loadSystemFiles() {
  storage.ref('system_files/companies.xlsx').getDownloadURL()
    .then((url) => {
      $('#company-list-download-button').attr('href', url);
    });
  storage.ref('system_files/metric.xlsx').getDownloadURL()
    .then((url) => {
      $('#metric-list-download-button').attr('href', url);
    });
  storage.ref('system_files/verification.xlsx').getDownloadURL()
    .then((url) => {
      $('#verification-list-download-button').attr('href', url);
    });
}

$(function () {
  $('#loginButton').on('click', function () {
    email = $('#loginEmailInput').val();
    if (email == '') {
      alert('Please enter your email');
      return;
    }
    $(this).prop('disabled', true);
    $('.login-button-toggle').toggle();

    loginWithEmail(
      email,
      () => {
        $(this).prop('disabled', false);
        $('.login-button-toggle').toggle();
      },
    );
  });

  $('#register-button').on('click', function () {
    email = $('#analystEmail').val();
    analystName = $('#analystName').val();
    if (email == '' || analystName == '') {
      alert('Analyst email or name should not be empty');
      return;
    }
    $(this).prop('disabled', true);
    $('.register-button-toggle').toggle();
    createAccount(email, analystName);
  });

  $('#submit-data').on('click', function () {
    $(this).prop('disabled', true);
    $('.submit-data-button-loading-toggle').toggle();
    if (!searchDataParams.searched) {
      alert('Company and metric data has not been searched');
      $(this).prop('disabled', false);
      $('.submit-data-button-loading-toggle').toggle();
      return;
    }

    submitData();
  });

  $('#update-file-system').on('change', function () {
    if (!this.files[0]) return;
    fileName = this.files[0].name;

    if (fileName != 'companies.xlsx' && fileName != 'metric.xlsx' && fileName != 'verification.xlsx') {
      return alert(`Invalid file name "${fileName}". File name should be one of "companies.xlsx", "metric.xlsx", "verification.xlsx"`)
    }
    var tempFile = this.files[0];
    var reader = new FileReader();

    if (typeof (FileReader) != "undefined") {
      var reader = new FileReader();
      //For Browsers other than IE.
      console.log(reader.readAsBinaryString ? "true" : "false", "____");
      if (reader.readAsBinaryString) {
        reader.onload = async function (e) {
          var excelData = ProcessExcel(e.target.result);
          var diff = arr_diff(excelData, companies);
          for (let ti = 0; ti < excelData.length; ti++) {
            if (diff.indexOf(excelData[ti].company1) > -1) {
              console.log({
                id: excelData[ti]?.company1.split(" ").join("_"),
                company1: excelData[ti]?.company1,
                company2: excelData[ti]?.company2,
                company3: excelData[ti]?.company3,
              });
              let docs = excelData[ti]?.company1.split(" ").join("_");
              db.collection('data').doc('app').collection('company').doc(docs).set({
                company1: (excelData[ti]?.company1) ? excelData[ti]?.company1 : "",
                company2: (excelData[ti]?.company2) ? excelData[ti]?.company2 : "",
                company3: (excelData[ti]?.company3) ? excelData[ti]?.company3 : "",
                company4: (excelData[ti]?.company4) ? excelData[ti]?.company4 : "",
                company5: (excelData[ti]?.company5) ? excelData[ti]?.company5 : "",
                company6: (excelData[ti]?.company6) ? excelData[ti]?.company6 : "",
                company7: (excelData[ti]?.company7) ? excelData[ti]?.company7 : "",
                company8: (excelData[ti]?.company8) ? excelData[ti]?.company8 : "",
                company9: (excelData[ti]?.company9) ? excelData[ti]?.company9 : "",
                company10: (excelData[ti]?.company10) ? excelData[ti]?.company10 : "",
                company11: (excelData[ti]?.company11) ? excelData[ti]?.company11 : "",
              }).then(() => {
              })
              .catch((_) => {
                console.log(_)
              });
            }
          }
        };
        reader.readAsBinaryString(tempFile);
      } else {
        //For IE Browser.
        reader.onload = function (e) {
          var data = "";
          var bytes = new Uint8Array(e.target.result);
          for (var i = 0; i < bytes.byteLength; i++) {
            data += String.fromCharCode(bytes[i]);
          }
          var excelData = ProcessExcel(data);
          var diff = arr_diff(excelData, companies);
          for (let ti = 0; ti < excelData.length; ti++) {
            if (diff.indexOf(excelData[ti].company1) > -1) {
              console.log({
                id: excelData[ti]?.company1.split(" ").join("_"),
                company1: excelData[ti]?.company1,
                company2: excelData[ti]?.company2,
                company3: excelData[ti]?.company3,
              });
              let docs = excelData[ti]?.company1.split(" ").join("_");
              db.collection('data').doc('app').collection('company').doc(docs).set({
                company1: (excelData[ti]?.company1) ? excelData[ti]?.company1 : "",
                company2: (excelData[ti]?.company2) ? excelData[ti]?.company2 : "",
                company3: (excelData[ti]?.company3) ? excelData[ti]?.company3 : "",
                company4: (excelData[ti]?.company4) ? excelData[ti]?.company4 : "",
                company5: (excelData[ti]?.company5) ? excelData[ti]?.company5 : "",
                company6: (excelData[ti]?.company6) ? excelData[ti]?.company6 : "",
                company7: (excelData[ti]?.company7) ? excelData[ti]?.company7 : "",
                company8: (excelData[ti]?.company8) ? excelData[ti]?.company8 : "",
                company9: (excelData[ti]?.company9) ? excelData[ti]?.company9 : "",
                company10: (excelData[ti]?.company10) ? excelData[ti]?.company10 : "",
                company11: (excelData[ti]?.company11) ? excelData[ti]?.company11 : "",
              }).then(() => {
              })
              .catch((_) => {
                console.log(_)
              });
            }
          }
        };
        reader.readAsArrayBuffer(tempFile);
      }
    } else {
      alert("This browser does not support HTML5.");
    }
    const systemFileRef = storage.ref(`system_files/${fileName}`);
    systemFileRef.put(this.files[0]).then((snapshot) => {
      alert(`${fileName} uploaded.`);
    });
  });

  $('#status-verification-toggle-button').on('click', () => {
    $('.status-verification-toggle').toggle();
  })

  $('.toggle-comment:not(textarea)').on('click', () => {
    $('.toggle-comment').toggle();
  });

  $('#submit-comment').on('click', () => {
    value = $('textarea.toggle-comment').val();
    if (!value) {
      alert('Please add a comment');
      return;
    }
    $('#comment-container').append(
      `<div class="alert alert-secondary comment-data" data-type="new">
        ${value}
      </div>`
    );
  });

  $('#companyNameInput').on('input', function () {
    searchDataParams.companyName = $(this).val();
    searchDataParams.searched = false;
    searchDataParams.analystUid = '';
  });

  $('#metricNameInput').on('input', metricInputTrigger);

  $('.dropdownOptions').on('click', function () {
    $(this).parent().prev().text($(this).text());
  });

  $('#add-another-link-button').on('click', function () {
    $('#add-another-link').addClass('d-none')
    $('#add-another-link-form').removeClass('d-none')
  })

  $('#add-another-link-form-cancel-button').on('click', function () {
    $('#add-another-link-form').addClass('d-none')
    $('#add-another-link').removeClass('d-none')
  })

  $('#add-another-link-form-button').on('click', () => {
    label = $('#add-another-link-form-url-label').val();
    url = $('#add-another-link-form-url').val();

    if (!label) return alert('Please add label');
    if (!url) return alert('Please add url');

    $('#add-another-link-form').addClass('d-none');
    $('#add-another-link').removeClass('d-none');

    length = $('.another-link-input').length;
    $('#companyLinksTable tbody').append(
      `<tr class="align-baseline">
        <th scope="row">
          <label for="otherLinks${length}" class="col-form-label">
            ${label}:
          </label>
        </th>
        <td>
          <input type="text" id="otherLinks${length}" class="form-control 
          another-link-input" value="${url}">
        </td>
        <td style="width: 1rem;">
          <a class="fa fa-external-link text-decoration-none" target="_blank" href="${url}"
          </a>
        </td>
      </tr>`
    );
    $('#add-another-link-form-url-label').val('');
    $('#add-another-link-form-url').val('');
  })

  $('#getCompanyData').on('click', function () {
    $this = $(this);

    searchDataParams.companyName = $('#companyNameInput').val();
    if (!searchDataParams.companyName) {
      alert('Please select a company');
      return;
    }
    if (!searchDataParams.metricId) {
      alert('Please select a metric');
      return;
    }
    company = companies.find((e) => e.company1 == searchDataParams.companyName);
    if (!company) {
      alert('Invalid company. Please check your spelling or select company from dropdown');
      return;
    }

    clearAllData();
    searchDataParams.searched = true;
    searchDataParams.companyId = company.id;
    searchDataParams.companyMetricId = searchDataParams.companyId + searchDataParams.metricId;

    $('.get-company-data-loading-toggle').toggle();
    $this.prop('disabled', true);

    db.doc(`company_metric/${searchDataParams.companyMetricId}`).get()
      .then((doc) => {
        data = doc.data();
        if (data && data.status != 'Assigned') {
          setDocumentData(data);

          searchDataParams = {
            metricName: data.metricName,
            metricId: data.metricId,
            companyName: data.companyName,
            companyId: data.companyId,
            companyMetricId: doc.id,
            analystUid: data.analystUid,
            searched: true,
          };

          $('.get-company-data-loading-toggle').toggle();
          $this.prop('disabled', false);
          $('#submit-button').text('SHARE FEEDBACK');
        } else {
          $('#submit-button').text('SUBMIT');
          companyNames = [];
          for (let i = 0; i < companyNameArray.length; i++) {
            const name = company[companyNameArray[i]];
            if (name) companyNames.push(name);
          }
          fetchGoogleData();
          fetchSCBCData(companyNames);
          fetchPrisonData(companyNames);
          initRelaunchPadData(companyNames);
        }
      })
      .catch((_) => {
        alert('Something went wrong.');

        $('.get-company-data-loading-toggle').toggle();
        $this.prop('disabled', false);
      });
  });
});

function metricInputTrigger() {
  searchDataParams.metricId = '';
  searchDataParams.searched = false;
  var $this = $('#metricNameInput');
  val = $this.val();

  list = $this.attr('list');
  $('#metricOptionDefinition').text('Select a metric');
  $('#metricScoringDefinition').text('Select a metric');
  $('#select-metric-option').empty();
  $('#metric-score-option-title').empty();
  $('#' + list + ' option').filter(function () {
    if ($(this).val() === val) {
      searchDataParams.metricId = $(this).attr('data-id');
      def = metricMap.get(searchDataParams.metricId).definition;
      searchDataParams.metricName = metricMap.get(searchDataParams.metricId).metric;

      $('#metricOptionDefinition').text(def);
      $('#metricScoringDefinition').text(val);
      updateMetricScore();
    }
  });
}

function updateMetricScore() {
  metricScores = metricMap.get(searchDataParams.metricId).metricScores;
  for (i = 0; i < metricScores.length; i++) {
    $('#select-metric-option').append(
      `<input type="radio" class="btn-check" name="metric-scoring-option" id="metric-scoring-${i}" autocomplete="off" ${i == 0 ? 'checked' : ''} value="${i}" title="${metricScores[i]}">
      <label class="btn btn-outline-pink shadow w-auto mx-2 py-3 px-4" for="metric-scoring-${i}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${metricScores[i]}">
        <span class="fs-2">${i}</span>
        <div class="position-absolute">
          <small class="fa fa-check-circle position-absolute text-purple show-if-checked" style="left: 20px;top: -58px;"></small>
          <small class="fa fa-info-circle text-orange position-absolute" style="left: 20px;"></small>
        </div>
      </label>`
    );
  }
  $('input[type=radio][name=metric-scoring-option]').on('change', function () {
    updateMetricScoreTitle($(this).attr('title'));
  });
  updateMetricScoreTitle(metricScores[0]);
}

function updateMetricScoreTitle(title) {
  $('#metric-score-option-title').text(title);
}

function clearAllData() {
  $('#companyHomePage').val('');
  $('#companyHomePageHref').removeAttr('href');
  $('#openGlassdoorButton').removeAttr('href');
  for (i = 0; i < 10; i++) {
    $('#companyLinks' + i).val('');
    $('#companyLinks' + i + 'Href').removeAttr('href');
    $('#company-links-indicator' + i).removeClass('bg-primary').removeClass('bg-yellow').removeClass('bg-orange').removeClass('bg-danger').attr('data-color', '');
  }
  $('#careerPage').val('');
  $('#careerPageHref').removeAttr('href');
  $('#aboutUsPage').val('');
  $('#aboutUsPageHref').removeAttr('href');
  $('#csrPage').val('');
  $('#csrPageHref').removeAttr('href');
  $('#companyTypeInput').val('');
  $('#companySize').val('');
  $('#industryInput').val('');
  $('#reviewCount').val('');
  $('#averageRating').val('');
  $('#averageBenefitRating').val('');
  $('#comment-container').empty();
  $('.another-link-input').each(function (i, obj) {
    $(this).closest('tr').remove();
  });
  $('#rlpHC').hide();
  $('#rlpAC').hide();
  $('#rlpLC').hide();
  $('#rlpNL').hide();
  $('#relaunchNotAvailable').text('--').show()
    .attr('data-value', 'NOT AVAILABLE');

  $('#scbcListed').hide();
  $('#scbcNotListed').hide();
  $('#scbcNotAvailable').text('--').show().attr('data-value', 'NOT AVAILABLE');;

  $('#prisonNotListed').hide();
  $('#prisonListed').hide();
  $('#prisonNotAvailable').text('--').show()
    .attr('data-value', 'NOT AVAILABLE');
}

function fetchGoogleData() {
  companyName = searchDataParams.companyName;
  topUrl = 'https://serene-temple-33444.herokuapp.com/https://www.google.com/search?q=';
  url = topUrl + 'glassdoor+' + companyName + '+"overview"';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseGoogle(data));

  url = topUrl + 'glassdoor+' + companyName + '+"reviews"';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseGoogle(data, 'reviews'));

  url = topUrl + 'glassdoor+' + companyName + '+"benefit"+united+states';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseGoogle(data, 'benefits'));

  url = topUrl + companyName + '+website';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseCompanyPage(data));

  url = topUrl + companyName + '+careers';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseCompanyPage(data, 'careers'));

  url = topUrl + companyName + '+aboutus';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseCompanyPage(data, 'aboutus'));

  url = topUrl + companyName + '+csr';
  url = url.split(' ').join('+');
  $.get(url, (data, _) => parseCompanyPage(data, 'csr'));

  keyword = metricMap.get(searchDataParams.metricId).keywords[0] ?? '';
  url = topUrl + '"' + companyName + '"+' + keyword;
  url = url.split(' ').join('+');
  $.get(url, (data, _) => top10Links(data));
}

function parseCompanyPage(text, page = 'homepage') {
  start = text.indexOf('data-async-context="query');
  start = text.indexOf('<a href="', start);

  start = start + 9;
  end = text.indexOf('"', start);
  href = text.substring(start, end);
  if (page == 'homepage') {
    cleanHref = cleanData(href);
    $('#companyHomePage').val(cleanHref);
    if (cleanHref != 'Not Available') {
      $('#companyHomePageHref').attr('href', cleanHref);
    }
  }
  if (page == 'careers') {
    cleanHref = cleanData(href);
    $('#careerPage').val(cleanHref);
    if (cleanHref != 'Not Available') {
      $('#careerPageHref').attr('href', cleanHref);
    }
  }
  if (page == 'aboutus') {
    cleanHref = cleanData(href);
    $('#aboutUsPage').val(cleanHref);
    if (cleanHref != 'Not Available') {
      $('#aboutUsPageHref').attr('href', cleanHref);
    }

    $('.get-company-data-loading-toggle').toggle();
    $('#getCompanyData').prop('disabled', false);
  }
  if (page == 'csr') {
    cleanHref = cleanData(href);
    $('#csrPage').val(cleanHref);
    if (cleanHref != 'Not Available') {
      $('#csrPageHref').attr('href', cleanHref);
    }
  }
}

async function top10Links(text) {
  var doc = document.createElement("html");
  doc.innerHTML = text;
  var links = doc.getElementsByTagName("a");

  const linksMap = new Map();
  for (i = 0; i < links.length; i++) {
    let link = links[i].getAttribute("href");
    if (link == null) continue;
    absoluteLink = link.substring(0, 5).toLowerCase() == 'https';
    googleLink = link.includes('google.com');
    if (!absoluteLink || googleLink || link in linksMap) continue;

    linksMap.set(link, 0);
  }

  linkMapKeys = Array.from(linksMap.keys());
  const promises = [];
  for (let i = 0; i < linksMap.size; i++) {
    promises.push(checkForRelevance(linkMapKeys[i]));
  }
  const countArr = await Promise.all(promises);
  countArr.forEach((count) => linksMap.set(linkMapKeys[i], count));
  implementTopLinksDom(linksMap);
}

function checkForRelevance(link) {
  return new Promise((resolve, reject) => {
    $.get('https://serene-temple-33444.herokuapp.com/' + link, (data, _) => {
      data = data?.toLowerCase() ?? '';
      keywords = metricMap.get(searchDataParams.metricId).keywords;
      count = 0;
      for (i = 0; i < keywords.length; i++) {
        count += occurrences(data, keywords[i].toLowerCase());
      }
      return resolve(count);
    }).catch(e => resolve(0));
  })
}

function implementTopLinksDom(linksMap) {
  const sortedLinks =
    new Map([...linksMap.entries()].sort((a, b) => b[1] - a[1]));
  sortedLinksKeys = Array.from(sortedLinks.keys());
  sortedLinksValues = Array.from(sortedLinks.values());
  maxCount = sortedLinksValues[0];
  oneTenth = maxCount * 1 / 10;
  oneFifth = maxCount * 1 / 5;
  half = maxCount * 1 / 2;
  for (i = 0; i < 10 && i < sortedLinks.size; i++) {
    $('#companyLinks' + i).val(sortedLinksKeys[i]);
    $('#companyLinks' + i + 'Href').attr('href', sortedLinksKeys[i]);
    color = 'bg-danger';
    switch (true) {
      case sortedLinksValues[i] > half:
        color = 'bg-primary';
        break;
      case sortedLinksValues[i] > oneFifth:
        color = 'bg-yellow';
        break;
      case sortedLinksValues[i] > oneTenth:
        color = 'bg-orange';
        break;
    }
    $('#company-links-indicator' + i).addClass(color).attr('data-color', color);
  }
}

function occurrences(string, subString, allowOverlapping) {
  string += '';
  subString += '';
  if (subString.length <= 0) return (string.length + 1);
  var n = 0,
    pos = 0,
    step = allowOverlapping ? 1 : subString.length;

  while (true) {
    pos = string.indexOf(subString, pos);
    if (pos >= 0) {
      ++n;
      pos += step;
    } else break;
  }
  return n;
}

function cleanData(text) {
  if (text.includes('DOCTYPE')) return 'Not Available';
  return text;
}

function parseGoogle(text, page = 'overview') {
  var doc = document.createElement("html");
  doc.innerHTML = text;
  var links = doc.getElementsByTagName("a");

  for (var i = 0; i < links.length; i++) {
    let link = links[i].getAttribute("href");
    if (link == null) continue;
    linkExt = link.substring(0, 26 + page.length).toLowerCase()
    if (linkExt == 'https://www.glassdoor.com/' + page) {
      if (page == 'overview')
        $('#openGlassdoorButton').attr('href', link);
      fetchGlassdoorData(link, page);
      break;
    }
  }
}

function fetchGlassdoorData(link, page) {
  var addMessage = functions.httpsCallable('scrapeData-fetchGlassdoorLink');
  addMessage({ link, page })
    .then((result) => {
      var data = result.data;
      if (page == 'overview') return parseGlassdoorData(data);
      if (page == 'reviews') return parseGlassdoorReviewData(data);
      return parseGlassdoorBenefitData(data);
    })
    .catch((_) => {
      alert('Something went wrong.');
    });
}

function initRelaunchPadData(companyNames) {
  $('#relaunchNotAvailable').text('LOADING')
    .attr('data-value', 'NOT AVAILABLE');

  fetchRelaunchPadDataResults = [];
  for (i = 0; i < companyNames.length; i++) {
    fetchRelaunchPadData(companyNames, i);
  };
}

function fetchRelaunchPadData(companyNames, i) {
  $.post('https://serene-temple-33444.herokuapp.com/https://therelaunchpad.com/wp-json/relaunch-pad/companies',
    JSON.stringify({ "search": { "text": companyNames[i] } }),
    (data, _) => {
      fetchRelaunchPadDataResults.push(data.data.companies);
      if (fetchRelaunchPadDataResults.length == companyNames.length)
        processRelaunchPadData();
    });
}

function processRelaunchPadData() {
  rlpLC = rlpAC = rlpHC = false;
  for (i = 0; i < fetchRelaunchPadDataResults.length; i++) {
    company = fetchRelaunchPadDataResults[i][0];
    if (!company || company == {}) continue;

    if (company.likelihood == 3) rlpLC = true;
    if (company.likelihood == 2) rlpAC = true;
    if (company.likelihood == 1) rlpHC = true;
  };

  $('#relaunchNotAvailable').hide();
  if (rlpLC || rlpAC || rlpHC) $('#rlpNL').hide();
  if (rlpHC) {
    $('#relaunchNotAvailable').attr('data-value', 'HIGH CHANCE');
    $('#rlpHC').show();
    return;
  }
  if (rlpAC) {
    $('#relaunchNotAvailable').attr('data-value', 'AVERAGE CHANCE');
    $('#rlpAC').show();
    return;
  }
  if (rlpLC) {
    $('#relaunchNotAvailable').attr('data-value', 'LOW CHANCE');
    $('#rlpLC').show();
    return;
  }
  $('#rlpNL').show();
  $('#relaunchNotAvailable').attr('data-value', 'NOT LISTED');
}

function fetchSCBCData(companyNames) {
  $('#scbcNotAvailable').text('LOADING').attr('data-value', 'NOT AVAILABLE');

  $.get('https://serene-temple-33444.herokuapp.com/https://secondchancebusinesscoalition.org/about', (data, _) => {
    return parseSCBCData(data, companyNames);
  });
}

function parseSCBCData(text, companyNames) {
  found = false;
  for (i = 0; i < companyNames.length; i++) {
    index = text.indexOf(`<img alt="${companyNames[i]}"`);
    if (index != -1) {
      found = true;
      break;
    }
  };

  $('#scbcNotAvailable').hide();
  if (found) {
    $('#scbcListed').show();
    $('#scbcNotListed').hide();
    $('#scbcNotAvailable').attr('data-value', 'LISTED');
  } else {
    $('#scbcListed').hide();
    $('#scbcNotListed').show();
    $('#scbcNotAvailable').attr('data-value', 'NOT LISTED');
  }
}

function fetchPrisonData(companyNames) {
  $('#prisonNotAvailable').text('LOADING').attr('data-value', 'NOT AVAILABLE');

  $.get('https://serene-temple-33444.herokuapp.com/https://investigate.afsc.org/prisons', (data, _) => {
    return parsePrisonData(data, companyNames);
  });
}

function parsePrisonData(text, companyNames) {
  found = false;
  for (i = 0; i < companyNames.length; i++) {
    index = text.indexOf(`hreflang="en">${companyNames[i]}</a>`);
    if (index != -1) {
      found = true;
      break;
    }
  };

  $('#prisonNotAvailable').hide();
  if (found) {
    $('#prisonNotListed').hide();
    $('#prisonListed').show();
    $('#prisonNotAvailable').attr('data-value', 'LISTED');
  } else {
    $('#prisonNotListed').show();
    $('#prisonListed').hide();
    $('#prisonNotAvailable').attr('data-value', 'NOT LISTED');
  }
}

function parseGlassdoorData(text) {
  type = getAttribute(text, 'data-test="employer-type"');
  type = cleanData(type).replace('Company - ', '')
  $('#companyTypeInput').val(type);

  size = getAttribute(text, 'data-test="employer-size"')
  size = cleanData(size).replace('Employees', '')
  $('#companySize').val(size);

  industry = getAttribute(text, 'data-test="employer-industry"', '</a>')
  industry = cleanData(industry).replace('&amp;', '&')
  $('#industryInput').val(industry);

  reviewsCount = getAttribute(text, "data-label='Reviews'>", '</span>', 25)
    .trim()
  $('#reviewCount').val(cleanData(reviewsCount));
}

function parseGlassdoorReviewData(text) {
  averageReview = getAttribute(text, 'v2__EIReviewsRatingsStylesV2__ratingNum')
  $('#averageRating').val(cleanData(averageReview));
}

function parseGlassdoorBenefitData(text) {
  benefitRating = getAttribute(text, 'css-b63kyi css-16iqw5x', '</strong>')
  $('#averageBenefitRating').val(cleanData(benefitRating));
}

function getAttribute(text, attribute, endText = '</div>', startIndex = 0) {
  start = text.indexOf(attribute)
  start = text.indexOf('>', start + startIndex) + 1
  end = text.indexOf(endText, start)
  return text.substring(start, end)
}
function ProcessExcel(data) {
  var workbook = XLSX.read(data, {
    type: 'binary'
  });

  //Fetch the name of First Sheet.
  var firstSheet = workbook.SheetNames[0];

  //Read all rows from First Sheet into an JSON array.
  var excelRows = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[firstSheet]);
  return excelRows;
}
function arr_diff(a1, a2) {

  var a = [], diff = [];
  for (var i = 0; i < a1.length; i++) {
    a[a1[i].company1] = true;
  }
  for (var i = 0; i < a2.length; i++) {
    if (a[a2[i].company1]) {
      delete a[a2[i].company1];
    } else {
      a[a2[i].company1] = true;
    }
  }

  for (var k in a) {
    diff.push(k);
  }

  return diff;
}